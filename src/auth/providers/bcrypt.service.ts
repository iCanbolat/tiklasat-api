import { compare, genSalt, hash } from 'bcryptjs';
import { HashingService } from './hashing.service';

export class BcryptService implements HashingService {
  async hash(data: string | Buffer): Promise<string> {
    const salt = await genSalt(10);
    return hash(data.toString(), salt);
  }
  async compare(data: string | Buffer, encrypted: string): Promise<boolean> {
    return compare(data.toString(), encrypted);
  }
}
