export type VideoEntry = {
    id: number;
    title: string;
    image: string;
    channel: string;
    type: string;
    link: string;
    tags?: string[];
};

export type RecipeEntry = {
    id: number;
    title: string;
    image: string;
    likes: number;
    description: string;
    ingredients: string[];
    instructions: string[];
    tags?: string[];
};

export type ProduceEntry = {
    id: number;
    title: string;
    image: string;
    nutrients: string[];
    benefits: string[];
};

export type SupplementEntry = {
    id: number;
    title: string;
    image: string;
    nutrients: string[];
    benefits: string[];
    notes?: string;
};

export type AboutListItem = {
    id: string;
    title: string;
    subtitle?: string;
    meta?: string;
    kind?: string;
    onClick?: () => void;
};

export type AboutListSection = {
    id: string;
    title: string;
    description: string;
    items: AboutListItem[];
    emptyState?: string;
};

export type MealPlanDay = {
    id: string;
    dayLabel: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    notes: string;
};
