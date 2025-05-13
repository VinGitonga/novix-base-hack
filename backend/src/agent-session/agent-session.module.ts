import { Module } from '@nestjs/common';
import { AgentSessionService } from './agent-session.service';
import { AgentSessionController, AgentSessionGateway } from './agent-session.controller';
import { AgentModule } from 'src/agent/agent.module';

@Module({
  imports: [AgentModule],
  controllers: [AgentSessionController],
  providers: [AgentSessionService, AgentSessionGateway],
})
export class AgentSessionModule {}
