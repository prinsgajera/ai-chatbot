import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';

import { User } from './user.entity';
import { ResponseUtil } from 'src/utils/Response.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(payload: User): Promise<any> {
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
    return ResponseUtil.success(savedUser, 'User Created Successfully');
  }

  async findByEmail(email: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    return ResponseUtil.success(user, 'User Get Successfully');
  }

  async findById(id: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    return ResponseUtil.success(user, 'User Get Successfully');
  }

  async findAll(): Promise<any> {
    const users = await this.userRepository.find();
    return ResponseUtil.success(users, 'Users fetched Successfully');
  }
}
