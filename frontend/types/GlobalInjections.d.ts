declare global {
    interface Window {
        __METRO_BUDDY_API_HOST__: string;
        __FEATURE_FLAGS__: Record<string, boolean>;
    }
}
export {};
