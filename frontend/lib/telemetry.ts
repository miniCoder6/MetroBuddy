export const TelemetryLogger = {
    logPageView: (path: string) => console.log([Telemetry] PageView: ),
    logInteraction: (elementId: string) => console.log([Telemetry] Click: ),
    reportVitals: (vitals: any) => console.log([Telemetry] WebVitals:, vitals)
};
