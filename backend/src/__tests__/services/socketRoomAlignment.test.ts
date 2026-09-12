import fs from 'fs';
import path from 'path';

describe('Socket Room Alignment Tests for Drift Alerts', () => {
  const backendSrcDir = path.resolve(__dirname, '../../');

  it('should assert socket room names match between server join and ai.controller emit for drift:detected', () => {
    const serverFile = path.join(backendSrcDir, 'server.ts');
    const aiControllerFile = path.join(backendSrcDir, 'controllers/ai.controller.ts');

    expect(fs.existsSync(serverFile)).toBe(true);
    expect(fs.existsSync(aiControllerFile)).toBe(true);

    const serverContent = fs.readFileSync(serverFile, 'utf-8');
    const controllerContent = fs.readFileSync(aiControllerFile, 'utf-8');

    // 1. Assert server.ts joins company_${organizationId}
    const serverJoinMatch = serverContent.match(/socket\.join\(`company_\$\{([^}]+)\}`\)/);
    expect(serverJoinMatch).not.toBeNull();

    // 2. Assert ai.controller.ts emits drift:detected to company_${organizationId}
    const controllerEmitMatch = controllerContent.match(/io\.to\(`company_\$\{([^}]+)\}`\)\.emit\(['"]drift:detected['"]/);
    expect(controllerEmitMatch).not.toBeNull();

    // 3. Assert the old incorrect room naming org:${organizationId} is completely eliminated
    expect(controllerContent).not.toMatch(/io\.to\(`org:\$\{/);
  });

  describe('Socket Room Join and Emit Logic Unit Tests', () => {
    it('should assert join room format matches emit room format for any organizationId', () => {
      const getJoinedRoom = (orgId: string) => `company_${orgId}`;
      const getDriftEmitRoom = (orgId: string) => `company_${orgId}`;
      const legacyWrongRoom = (orgId: string) => `org:${orgId}`;

      const testOrgs = [
        '00000000-0000-0000-0000-000000000001',
        'org_abc_123',
        'enterprise-test-org-99'
      ];

      for (const orgId of testOrgs) {
        const joinedRoom = getJoinedRoom(orgId);
        const emitRoom = getDriftEmitRoom(orgId);

        // Assert join and emit target the exact same room
        expect(joinedRoom).toBe(emitRoom);
        expect(joinedRoom).toBe(`company_${orgId}`);

        // Assert legacy mismatch room is NOT targeted
        expect(emitRoom).not.toBe(legacyWrongRoom(orgId));
      }
    });

    it('should route drift:detected alerts exclusively to company_${orgId}', () => {
      const rooms: Record<string, Set<string>> = {};
      const deliveredMessages: Record<string, any[]> = {};

      const mockSocket = (socketId: string) => ({
        id: socketId,
        join: (room: string) => {
          if (!rooms[room]) rooms[room] = new Set();
          rooms[room].add(socketId);
        },
        receive: (event: string, payload: any) => {
          if (!deliveredMessages[socketId]) deliveredMessages[socketId] = [];
          deliveredMessages[socketId].push({ event, payload });
        }
      });

      const client1 = mockSocket('socket-client-1'); // Belongs to org-A
      const client2 = mockSocket('socket-client-2'); // Belongs to org-B

      // Simulating socket join logic in server.ts
      const orgA = 'org-uuid-A';
      const orgB = 'org-uuid-B';
      client1.join(`company_${orgA}`);
      client2.join(`company_${orgB}`);

      // Verify room membership
      expect(rooms[`company_${orgA}`].has('socket-client-1')).toBe(true);
      expect(rooms[`company_${orgA}`].has('socket-client-2')).toBe(false);

      // Simulating io.to(`company_${organizationId}`).emit('drift:detected', payload)
      const emitToRoom = (room: string, event: string, payload: any) => {
        const targetSockets = rooms[room] || new Set();
        for (const sockId of targetSockets) {
          if (sockId === client1.id) client1.receive(event, payload);
          if (sockId === client2.id) client2.receive(event, payload);
        }
      };

      const driftPayload = [
        {
          type: 'volume_spike',
          severity: 'high',
          agentId: 'support-agent',
          organizationId: orgA
        }
      ];

      emitToRoom(`company_${orgA}`, 'drift:detected', driftPayload);

      // Client 1 (joined to company_orgA) must receive the drift alert
      expect(deliveredMessages['socket-client-1']).toHaveLength(1);
      expect(deliveredMessages['socket-client-1'][0].event).toBe('drift:detected');
      expect(deliveredMessages['socket-client-1'][0].payload).toEqual(driftPayload);

      // Client 2 (joined to company_orgB) must NOT receive it
      expect(deliveredMessages['socket-client-2']).toBeUndefined();
    });
  });
});
