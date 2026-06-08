import { CcpaService } from '../services/ccpa.service';
import { createIsoFrameworkController } from '../utils/isoControllerFactory';

const ctrl = createIsoFrameworkController(CcpaService);

export const getFrameworkOverview = ctrl.getFrameworkOverview;
export const updateImplementation = ctrl.updateImplementation;
export const getComplianceScore = ctrl.getComplianceScore;
export const getFrameworkControls = ctrl.getFrameworkControls;

