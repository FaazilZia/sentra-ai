import { Router } from 'express';
import { InventoryService } from '../services/inventory.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/agents', authenticate, async (req: any, res) => {
  try {
    const agents = await InventoryService.listAgents(req.user.companyId);
    res.json(agents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/agents', authenticate, async (req: any, res) => {
  try {
    const agent = await InventoryService.createAgent(req.user.companyId, req.body);
    res.status(201).json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:id', authenticate, async (req: any, res) => {
  try {
    const agent = await InventoryService.getAgent(req.params.id, req.user.companyId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/agents/:id', authenticate, async (req: any, res) => {
  try {
    const agent = await InventoryService.updateAgent(req.params.id, req.user.companyId, req.body);
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/agents/:id', authenticate, async (req: any, res) => {
  try {
    await InventoryService.deleteAgent(req.params.id, req.user.companyId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
