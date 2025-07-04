import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductsService } from '../providers/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductTable } from 'src/database/schemas';
import slugify from 'slugify';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CategoriesService } from 'src/categories/categories.service';
import {
  ProductImageTable,
  ProductSagaLogTable,
  ProductVariantTable,
  RelatedProductTable,
} from 'src/database/schemas/products.schema';
import { and, eq, inArray } from 'drizzle-orm';

type SagaStep = {
  name: SagaStepName;
  status: 'pending' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  data?: any;
  error?: string;
};

type SagaLog = {
  id: string;
  status: 'pending' | 'complete' | 'failed';
  steps: SagaStep[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
};

enum SagaStepName {
  CREATE_PRODUCT = 'create_product',
  UPLOAD_IMAGES = 'upload_images',
  LINK_CATEGORY = 'link_category',
  LINK_RELATED_PRODUCTS = 'link_related_products',
  CREATE_ATTRIBUTES = 'create_attributes',
}

@Injectable()
export class ProductCreateSaga {
  private readonly logger = new Logger(ProductCreateSaga.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly categoryService: CategoriesService,
  ) {}

  async execute(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    const sagaId = crypto.randomUUID();
    const sagaLog: SagaLog = {
      id: sagaId,
      status: 'pending',
      steps: [],
      createdAt: new Date(),
    };
    let category: { id: string; name: string };

    try {
      const product = await this.createProductStep(createProductDto, sagaLog);

      const images = await this.uploadImagesStep(
        product.id,
        files,
        createProductDto,
        sagaLog,
      );

      if (createProductDto.category) {
        category = await this.linkCategoryStep(
          product.id,
          createProductDto.category[0].id,
          sagaLog,
        );
      }
      if (
        createProductDto.relatedProductsToAdd?.length > 0 ||
        createProductDto.relatedProductsToRemove?.length > 0
      ) {
        await this.linkRelatedProductsStep(
          product.id,
          createProductDto.relatedProductsToAdd ?? [],
          createProductDto.relatedProductsToRemove ?? [],
          sagaLog,
        );
      }

      if (createProductDto.attributes?.length) {
        await this.createAttributesStep(
          product.id,
          createProductDto.attributes,
          sagaLog,
        );
      }

      sagaLog.status = 'complete';
      sagaLog.completedAt = new Date();

      this.logger.log(`Saga completed successfully for product ${product.id}`);

      return {
        product,
        images,
        attributes: createProductDto.attributes,
        category,
      };
    } catch (error) {
      this.logger.error(`Saga ${sagaId} failed: ${error.message}`);
      sagaLog.status = 'failed';
      sagaLog.error = error.message;

      await this.compensate(sagaLog);
      throw error;
    }
  }

  private async createProductStep(
    createProductDto: CreateProductDto,
    sagaLog: SagaLog,
  ) {
    const step: SagaStep = {
      name: SagaStepName.CREATE_PRODUCT,
      status: 'pending',
      startedAt: new Date(),
    };

    sagaLog.steps.push(step);

    try {
      const [product] = await this.drizzleService.db
        .insert(ProductTable)
        .values({
          name: createProductDto.name,
          slug:
            createProductDto.slug ||
            slugify(createProductDto.name, { lower: true }),
          isFeatured: createProductDto.isFeatured,
          price: createProductDto.price,
          currency: createProductDto.currency,
          status: createProductDto.status,
          sku: createProductDto.sku,
          stockUnderThreshold: createProductDto.stockUnderThreshold,
          description: createProductDto.description,
          stockQuantity: createProductDto.stockQuantity,
          parentId: createProductDto.parentId,
        })
        .returning();

      step.status = 'completed';
      step.data = { productId: product.id };
      step.completedAt = new Date();
      return product;
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      throw error;
    }
  }

  private async uploadImagesStep(
    productId: string,
    files: Express.Multer.File[],
    createProductDto: CreateProductDto,
    sagaLog: SagaLog,
  ) {
    if (!files?.length) return [];

    const step: SagaStep = {
      name: SagaStepName.UPLOAD_IMAGES,
      status: 'pending',
      startedAt: new Date(),
    };

    sagaLog.steps.push(step);

    try {
      const uploadPromises = files.map((file, index) => {
        const displayOrder = createProductDto.displayOrders?.[index] || index;
        return this.cloudinaryService.uploadProductImage(
          file,
          productId,
          displayOrder,
        );
      });

      const images = await Promise.all(uploadPromises);
      step.status = 'completed';
      step.data = { imageIds: images.map((img) => img.cloudinaryId) };
      step.completedAt = new Date();
      return images;
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      throw error;
    }
  }

  private async linkRelatedProductsStep(
    productId: string,
    linkRelatedProductIds: string[],
    unlinkRelatedProductIds: string[],
    sagaLog: SagaLog,
  ) {
    const step: SagaStep = {
      name: SagaStepName.LINK_RELATED_PRODUCTS,
      status: 'pending',
      startedAt: new Date(),
    };

    sagaLog.steps.push(step);

    try {
      if (linkRelatedProductIds.length > 0)
        await this.drizzleService.db.insert(RelatedProductTable).values(
          linkRelatedProductIds.map((relatedProductId) => ({
            productId,
            relatedProductId,
          })),
        );

      if (unlinkRelatedProductIds.length > 0)
        await this.drizzleService.db
          .delete(RelatedProductTable)
          .where(
            and(
              eq(RelatedProductTable.productId, productId),
              inArray(
                RelatedProductTable.relatedProductId,
                unlinkRelatedProductIds,
              ),
            ),
          );

      step.status = 'completed';
      step.completedAt = new Date();
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      throw error;
    }
  }

  private async linkCategoryStep(
    productId: string,
    categoryId: string,
    sagaLog: SagaLog,
  ) {
    const step: SagaStep = {
      name: SagaStepName.LINK_CATEGORY,
      status: 'pending',
      startedAt: new Date(),
    };

    sagaLog.steps.push(step);

    try {
      const category =
        await this.categoryService.updateOrCreateCategoryWithProducts(
          categoryId,
          {
            productIdsToLink: [productId],
            productIdsToUnlink: [],
          },
        );

      step.status = 'completed';
      step.completedAt = new Date();
      return category.category;
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      throw error;
    }
  }

  private async createAttributesStep(
    productId: string,
    attributes: any[],
    sagaLog: SagaLog,
  ) {
    const step: SagaStep = {
      name: SagaStepName.CREATE_ATTRIBUTES,
      status: 'pending',
      startedAt: new Date(),
    };

    sagaLog.steps.push(step);

    try {
      await this.drizzleService.db.insert(ProductVariantTable).values(
        attributes.map((attr) => ({
          productId,
          variantType: slugify(attr.variantType, { lower: true }),
          value: slugify(attr.value, { lower: true }),
        })),
      );

      step.status = 'completed';
      step.completedAt = new Date();
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date();
      throw error;
    }
  }

  private async compensate(sagaLog: SagaLog) {
    for (let i = sagaLog.steps.length - 1; i >= 0; i--) {
      const step = sagaLog.steps[i];

      try {
        switch (step.name) {
          case SagaStepName.CREATE_PRODUCT:
            if (step.status === 'completed') {
              await this.drizzleService.db
                .delete(ProductTable)
                .where(eq(ProductTable.id, step.data.productId));
            }
            break;

          case SagaStepName.UPLOAD_IMAGES:
            if (step.status === 'completed') {
              await Promise.all(
                step.data.imageIds.map((id: string) =>
                  this.cloudinaryService.delete(id),
                ),
              );
              await this.drizzleService.db
                .delete(ProductImageTable)
                .where(
                  eq(
                    ProductImageTable.productId,
                    sagaLog.steps[0].data.productId,
                  ),
                );
            }
            break;

          case SagaStepName.LINK_CATEGORY:
            if (step.status === 'completed') {
              await this.categoryService.updateOrCreateCategoryWithProducts(
                step.data.categoryId,
                {
                  productIdsToLink: [],
                  productIdsToUnlink: [sagaLog.steps[0].data.productId],
                },
              );
            }
            break;

          case SagaStepName.CREATE_ATTRIBUTES:
            if (step.status === 'completed') {
              await this.drizzleService.db
                .delete(ProductVariantTable)
                .where(
                  eq(
                    ProductVariantTable.productId,
                    sagaLog.steps[0].data.productId,
                  ),
                );
            }
            break;
        }
      } catch (compError) {
        this.logger.error(
          `Compensation failed for step ${step.name}: ${compError.message}`,
        );
      }
    }
  }

  private async saveSagaLog(sagaLog: SagaLog) {}
}
