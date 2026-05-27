import { OecdService } from '../services/oecd.service';
import { createIsoFrameworkController } from '../utils/isoControllerFactory';

const ctrl = createIsoFrameworkController(OecdService);

export const getFrameworkOverview = ctrl.getFrameworkOverview;
export const updateImplementation = ctrl.updateImplementation;
export const getComplianceScore = ctrl.getComplianceScore;
