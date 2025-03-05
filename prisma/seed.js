import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const seedAdmin = async () => {
    const admin = await prisma.admin.count({
        where: {
            email: "admin@example.com"
        }
    });
    if (admin === 0) {
        console.log("Seeding admin...");
        return await prisma.admin.create({
            data: {
                email: "admin@example.com",
                password: await bcrypt.hash("12345678", 10),
                name: "Admin Baru"
            }
        });
    } else {
        console.log("Admin already exists");
    }
};

const seedBoardingHouse = async () => {
    const boardingHouse = await prisma.boardingHouse.count({
        where: {
            email: "boardinghouse@example.com"
        }
    });
    if (boardingHouse === 0) {
        console.log("Seeding boardingHouse...");
        return await prisma.boardingHouse.create({
            data: {
                email: "boardinghouse@example.com",
                password: await bcrypt.hash("12345678", 10),
                name: "BoardingHouse Baru",
                description: "Kos kosan ramah pengguna",
                district: "Sleman",
                location: "Jl. Jend. Sudirman No. 1, Yogyakarta",
                maxCapacity: 5,
                owner: "Abi Pamungkas",
                phone: "6285156031385",
                price: 940000,
                subdistrict: "Ngaglik",
            }
        });
    } else {
        console.log("BoardingHouse already exists");
    }
};


const main = async () => {
    try {
        await prisma.$connect();
        await seedAdmin();
        await seedBoardingHouse();
    } catch (error) {
        console.error(error);
        process.exit(1);
    } finally {
        prisma.$disconnect();
    }
}

main()
