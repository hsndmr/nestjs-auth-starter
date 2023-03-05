import { Test } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import { MODULE_OPTIONS_TOKEN } from './jwt.module-definition';
import { CryptoModule } from '../crypto/crypto.module';
import { CryptoService } from '../crypto/crypto.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [CryptoModule],
      providers: [
        JwtService,
        CryptoService,
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: {
            secret: 'secret',
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be signed', function () {
    const signed = service.sign({
      subject: '123',
    });

    expect(signed).toBeDefined();
  });

  it('should be verified', async function () {
    const signed = service.sign({
      subject: '123',
    });

    const verified = await service.verify(signed.token);

    expect(verified).toEqual({
      exp: signed.exp,
      jti: signed.jti,
      subject: '123',
      iat: expect.any(Number),
    });
  });

  it('should throw error jwt expired when verifying token', async function () {
    const newDate = new Date();
    const oldDate = new Date(newDate.getTime() - 61 * 60 * 1000);
    jest.useFakeTimers().setSystemTime(oldDate);
    const signed = service.sign({
      subject: '123',
    });
    jest.useFakeTimers().setSystemTime(newDate);

    await expect(service.verify(signed.token)).rejects.toThrow('jwt expired');
  });

  it('should throw error invalid signature when verifying token', async function () {
    const signed = service.sign({
      subject: '123',
    });

    await expect(service.verify(`${signed.token}1`)).rejects.toThrow(
      'invalid signature',
    );
  });
});
