import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const seedAdmin = async () => {
    const admin = await prisma.user.findFirst({
        where: {
            role: "Admin"
        }
    })
    if (admin) {
        console.log("Admin already exists");
        return;
    } else {
        const hashedPassword = await bcrypt.hash("12345678", 10);
        await prisma.user.create({
            data: {
                email: "admin@example.com",
                name: "Admin",
                password: hashedPassword,
                phone: "081234567890",
                role: "Admin",
            }
        })
    }
};

const seedUsers = async () => {
    const users = await prisma.user.findMany({
        where: {
            role: "User"
        }
    })
    if (users.length > 0) {
        console.log("Users already exist");
        return;
    } else {
        const hashedPassword = await bcrypt.hash("12345678", 10);
        const created = await prisma.user.createManyAndReturn({
            data: [
                {
                    email: "akane@example.com",
                    name: "Akane",
                    password: hashedPassword,
                    phone: "081234567891",
                    role: "User",
                },
                {
                    email: "asuka@example.com",
                    name: "Asuka",
                    password: hashedPassword,
                    phone: "081234567892",
                    role: "User",
                }
            ]
        })
        console.log(`Created ${created.map((user) => user.email).join(", ")} users`);
        return created;
    }
}

const seedAuction = async (userId) => {
    const auctions = await prisma.auction.findMany();
    if (auctions.length > 0) {
        console.log("Auctions already exist");
        return;
    } else {
        const create = await prisma.auction.createManyAndReturn({
            data: [
                {
                    name: "Air Jordan 1",
                    description: "Air Jordan 1 is a sneaker designed by Peter Moore and released by Nike in 1985. It was the first signature shoe for Michael Jordan.",
                    buyNowPrice: 1000000,
                    status: "Accepted",
                    userId,
                    location: "Jakarta",
                    minimumBid: 100000,
                    openingPrice: 500000,
                    category: "Footwear",
                    start: new Date(),
                    end: new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
                    images: [
                        "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//108/MTA-72639828/nike_jordan_1_retro_high_og_chicago_lost_and_found_full01_exiuigq9.jpg",
                        "https://senikersku.com/wp-content/uploads/2020/10/Jordan-1-High-Satin-Black-Toe-1.png"
                    ]
                },
                {
                    name: "The North Face Jacket",
                    description: "The North Face Jacket is a high-performance outdoor jacket designed for extreme weather conditions, providing warmth and protection.",
                    buyNowPrice: 2000000,
                    status: "Accepted",
                    userId,
                    location: "Bandung",
                    minimumBid: 200000,
                    openingPrice: 1000000,
                    category: "Outerwear",
                    start: new Date(),
                    end: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
                    images: [
                        "https://down-id.img.susercontent.com/file/1c2a1d8d3608edb010902bf5f062093a",
                        "https://media.karousell.com/media/photos/products/2024/9/9/jaket_zipper_the_north_face_tn_1725852360_1085b0a3_progressive.jpg"
                    ]

                },
                {
                    name: "Levis 501",
                    description: "Levis 501 is a jeans designed by Levi Strauss and Co. in 1873. It is one of the most popular jeans in the world.",
                    buyNowPrice: 1500000,
                    status: "Accepted",
                    userId,
                    location: "Surabaya",
                    minimumBid: 150000,
                    openingPrice: 750000,
                    category: "Bottoms",
                    start: new Date(),
                    end: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
                    images: [
                        "https://levi.co.id/cdn/shop/files/levis-mens-511-slim-jeans-045115883_1_ON_FV_860x945_crop_center.progressive.jpg?v=1713359997",
                    ]
                },
                {
                    name: "New York Yankees Cap",
                    description: "New York Yankees Cap is a official cap of the New York Yankees baseball team. It is made of high-quality materials and has a classic design.",
                    buyNowPrice: 200000,
                    status: "Accepted",
                    userId,
                    location: "Yogyakarta",
                    minimumBid: 20000,
                    openingPrice: 100000,
                    category: "Accessories",
                    start: new Date(),
                    end: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
                    images: [
                        "https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/8/30/f49ca787-b3f6-43de-81bd-20e04ca1f32a.jpg",
                    ]
                },
                {
                    name: "Uniqlo x Yoasobi Shirt",
                    description: "Uniqlo x Yoasobi Shirt is a limited edition shirt designed by Uniqlo and Yoasobi. It is made of high-quality materials and has a unique design.",
                    buyNowPrice: 250000,
                    status: "Accepted",
                    userId,
                    location: "Sumatra",
                    minimumBid: 25000,
                    openingPrice: 125000,
                    category: "Tops",
                    start: new Date(),
                    end: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
                    images: [
                        "https://i.ebayimg.com/images/g/CzYAAOSwqdJioyqW/s-l1200.jpg",
                    ]
                },
                {
                    name: "My Chemical Romance Band Shirt",
                    description: "My Chemical Romance Band Shirt is a themed shirt featuring designs inspired by the iconic rock band My Chemical Romance.",
                    buyNowPrice: 300000,
                    status: "Accepted",
                    userId,
                    location: "Papua",
                    minimumBid: 30000,
                    openingPrice: 150000,
                    category: "Tops",
                    start: new Date(),
                    end: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
                    images: [
                        "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//catalog-image/101/MTA-143914259/brd-122050_krmk-kaos-t-shirt-band-my-chemical-romance-mcr-logo-kaos-musik_full01-41668708.jpg",
                    ]
                }
            ]
        })
        console.log(`Created ${create.map((auction) => auction.name).join(", ")} auctions`);
        return create;
    }
}

const seed = async () => {
    console.log("Seeding started");
    await seedAdmin();
    const users = await seedUsers();
    if (users) {
        const userId = users[0].id;
        await seedAuction(userId);
    }
    console.log("Seeding completed");
    await prisma.$disconnect();
}

seed();