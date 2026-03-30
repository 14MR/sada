import { AppDataSource } from "../config/database";
import { Category } from "../models/Category";

const CATEGORIES = [
    { name: "Music", nameAr: "موسيقى", icon: "🎵", slug: "music", color: "#E91E63" },
    { name: "Comedy", nameAr: "كوميديا", icon: "😂", slug: "comedy", color: "#FF9800" },
    { name: "Talk", nameAr: "نقاش", icon: "💬", slug: "talk", color: "#2196F3" },
    { name: "Sports", nameAr: "رياضة", icon: "⚽", slug: "sports", color: "#4CAF50" },
    { name: "Business", nameAr: "أعمال", icon: "💼", slug: "business", color: "#607D8B" },
    { name: "Religion", nameAr: "دين", icon: "🕌", slug: "religion", color: "#9C27B0" },
    { name: "Education", nameAr: "تعليم", icon: "📚", slug: "education", color: "#00BCD4" },
    { name: "Technology", nameAr: "تقنية", icon: "💻", slug: "technology", color: "#3F51B5" },
];

async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Category);

    for (const cat of CATEGORIES) {
        const existing = await repo.findOne({ where: { slug: cat.slug } });
        if (!existing) {
            await repo.save(repo.create(cat));
            console.log(`✅ Created: ${cat.name} (${cat.nameAr})`);
        } else {
            console.log(`⏭️  Exists: ${cat.name}`);
        }
    }

    console.log("\n🌱 Seed complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
