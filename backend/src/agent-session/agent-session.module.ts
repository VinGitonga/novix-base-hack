import { Module } from '@nestjs/common';
import { AgentSessionService } from './agent-session.service';
import { AgentSessionController, AgentSessionGateway } from './agent-session.controller';
import { AgentModule } from 'src/agent/agent.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [AgentModule, PaymentsModule],
  controllers: [AgentSessionController],
  providers: [AgentSessionService, AgentSessionGateway],
})
export class AgentSessionModule {}
