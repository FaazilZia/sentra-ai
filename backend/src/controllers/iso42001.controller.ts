import { Iso42001Service } from '../services/iso42001.service';
import { createIsoFrameworkController } from '../utils/isoControllerFactory';

const ctrl = createIsoFrameworkController(Iso42001Service);

export const getFrameworkOverview = ctrl.getFrameworkOverview;
export const updateImplementation = ctrl.updateImplementation;
export const getComplianceScore = ctrl.getComplianceScore;
