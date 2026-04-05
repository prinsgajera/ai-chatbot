import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseUtil } from 'src/utils/Response.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) { }
  async register(payload: User): Promise<any> {
    const { email, password, userName } = payload;
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await this.userRepository.findOne({
      where: { email },
    });

    if (existing)
      throw new HttpException('user already exists', HttpStatus.BAD_REQUEST);

    const user = this.userRepository.create({
      email,
      userName,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    return ResponseUtil.success(savedUser, 'User Registered Successfully');
  }

  async validateUser(email: string, password: string): Promise<User> {
    const { data: user } = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return ResponseUtil.success(
      {
        user: payload,
        accessToken: this.jwtService.sign(payload),
      },
      'Login successfully',
    );
  }

  async profile(userId: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
      select: ['id', 'userName', 'email', 'chats', 'role'],
    });
    return ResponseUtil.success(user, 'User profile fetched successfully');
  }
}
