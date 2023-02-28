import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be created random string', function () {
    const randomString = service.randomString(1);

    expect(randomString).toHaveLength(2);
  });

  it('should hash a password with bcrypt', async () => {
    const password = 'myPassword123';
    const hashedPassword = await service.hashPassword(password, 1);

    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toEqual(password);
  });
  it('should compare a plaintext password to a hashed password', async () => {
    const password = 'myPassword123';
    const hashedPassword = await service.hashPassword(password);
    const isMatch = await service.comparePasswords(password, hashedPassword);

    expect(isMatch).toBe(true);
  });

  it('should return false for mismatched passwords', async () => {
    const password = 'myPassword123';
    const hashedPassword = await service.hashPassword(password);
    const isMatch = await service.comparePasswords(
      'wrongPassword',
      hashedPassword,
    );

    expect(isMatch).toBe(false);
  });
});
