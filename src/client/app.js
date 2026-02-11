import { initializeApp } from "./ui/appController.js";
import { initLoadingService } from "./services/loadingService.js";
import { initNotificationService } from "./services/notificationService.js";

initLoadingService();
initNotificationService();
initializeApp();
