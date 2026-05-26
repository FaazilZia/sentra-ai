import * as controller from '../controllers/iso42001.controller';
import { createIsoFrameworkRouter } from './isoRouteFactory';

export default createIsoFrameworkRouter(controller);
