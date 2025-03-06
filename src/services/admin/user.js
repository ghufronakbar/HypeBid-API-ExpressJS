import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: "User"
            },
            include: {
                auctions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                transactions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        });

        for (const user of users) {
            for (const transaction of user.transactions) {
                const expiredTime = new Date(transaction.createdAt)
                expiredTime.setDate(expiredTime.getDate() + 1)
                if (expiredTime < new Date() && transaction.status === "Pending") {
                    transaction.status = "Expired"
                }
            }
        }
        return res.status(200).json({ status: 200, message: "Success", data: users })
    } catch (error) {
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

const getUser = async (req, res) => {
    const { id } = req.params
    try {
        const user = await prisma.user.findFirst({
            where: {
                id
            },
            include: {
                auctions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                transactions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                bids: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                withdraws: {
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" })
        }

        for (const transaction of user.transactions) {
            const expiredTime = new Date(transaction.createdAt)
            expiredTime.setDate(expiredTime.getDate() + 1)
            if (expiredTime < new Date() && transaction.status === "Pending") {
                transaction.status = "Expired"
            }
        }

        return res.status(200).json({ status: 200, message: "Success", data: user })
    } catch (error) {
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

const setUserStatus = async (req, res) => {
    const { id } = req.params
    try {
        const user = await prisma.user.findFirst({
            where: {
                id
            }
        });
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" })
        }
        if (user && user.role === "Admin") {
            return res.status(400).json({ status: 400, message: "You are admin" })
        }
        const updatedUser = await prisma.user.update({
            where: {
                id
            },
            data: {
                banned: !user.banned,
            }
        })
        return res.status(200).json({ status: 200, message: updatedUser.banned ? "Successfull to activate user" : "Successfull to deactivate user", data: updatedUser })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

router.get("/", getAllUsers)
router.get("/:id", getUser)
router.patch("/:id", setUserStatus)

export default router