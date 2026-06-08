import { FtcService } from '../services/ftc.service';
import { createIsoFrameworkController } from '../utils/isoControllerFactory';

const ctrl = createIsoFrameworkController(FtcService);

export const getFrameworkOverview = ctrl.getFrameworkOverview;
export const updateImplementation = ctrl.updateImplementation;
export const getComplianceScore = ctrl.getComplianceScore;
export const getFrameworkControls = ctrl.getFrameworkControls;

