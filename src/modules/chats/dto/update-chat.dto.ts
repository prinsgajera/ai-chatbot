import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateChatDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;
}
