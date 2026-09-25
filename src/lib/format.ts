export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const floorLabel = (floor: number) => (floor === 0 ? "Ground floor" : `Floor ${floor}`);

export const furnishingLabel = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);
