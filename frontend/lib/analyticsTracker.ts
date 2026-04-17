export class AnalyticsTracker {
    private static instance: AnalyticsTracker;
    private constructor() {}
    public static getInstance() {
        if (!AnalyticsTracker.instance) { AnalyticsTracker.instance = new AnalyticsTracker(); }
        return AnalyticsTracker.instance;
    }
    public trackEvent(eventName: string, payload: any) {
        console.log([Analytics] , payload);
    }
}
