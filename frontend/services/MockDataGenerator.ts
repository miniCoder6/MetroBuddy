export interface MockUser { id: number; name: string; email: string; }
export const generateMockUsers = (count: number): MockUser[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1000,
        name: Test User ,
        email: 	ester@example.com
    }));
};
