import { DoraService } from '../services/dora.service';
import { createIsoFrameworkController } from '../utils/isoControllerFactory';

const ctrl = createIsoFrameworkController(DoraService);

export const getFrameworkOverview = ctrl.getFrameworkOverview;
export const updateImplementation = ctrl.updateImplementation;
export const getComplianceScore = ctrl.getComplianceScore;
