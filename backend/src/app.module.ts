import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configuration from "./config/configuration";
import { MongooseModule } from "@nestjs/mongoose";
import { AgentModule } from './agent/agent.module';
import { UserModule } from './user/user.module';
import { AgentSessionModule } from './agent-session/agent-session.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
	imports: [
		ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				uri: configService.get("mongo_uri"),
			}),
			inject: [ConfigService],
		}),
		AgentModule,
		UserModule,
		AgentSessionModule,
		PaymentsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
