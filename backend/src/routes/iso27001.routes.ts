import * as controller from '../controllers/iso27001.controller';
import { createIsoFrameworkRouter } from './isoRouteFactory';

export default createIsoFrameworkRouter(controller);
