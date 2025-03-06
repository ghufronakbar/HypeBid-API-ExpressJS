import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()

const getAllTransactions = async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                auction: {
                    include: {
                        seller: true
                    }
                },
                buyer: true,
            },
        })

        for (const transaction of transactions) {
            const expiredTime = new Date(transaction.createdAt)
            expiredTime.setDate(expiredTime.getDate() + 1)
            if (expiredTime < new Date() && transaction.status === "Pending") {
                transaction.status = "Expired"
            }
        }

        return res.status(200).json({ status: 200, message: 'Success', data: transactions })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const getTransaction = async (req, res) => {
    const { id } = req.params
    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                id
            },
            include: {
                auction: {
                    include: {
                        seller: true,
                    }
                },
                buyer: true
            }
        })
        if (!transaction) {
            return res.status(404).json({ status: 404, message: 'Transaction not found!' })
        }

        const expiredTime = new Date(transaction.createdAt)
        expiredTime.setDate(expiredTime.getDate() + 1)
        if (expiredTime < new Date() && transaction.status === "Pending") {
            transaction.status = "Expired"
        }

        return res.status(200).json({ status: 200, message: 'Success', data: transaction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const editLocation = async (req, res) => {
    try {
        const { id } = req.params
        const { id: userId } = req.decoded
        const { location } = req.body
        if (!location) {
            return res.status(400).json({ status: 400, message: 'Location is required!' })
        }
        const check = await prisma.transaction.findUnique({
            where: {
                id
            },
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'Transaction not found!' })
        }
        if (check.userId !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not buyer!' })
        }
        if (check.status !== "Pending") {
            return res.status(400).json({ status: 400, message: 'Not allowed to edit location!' })
        }
        const transaction = await prisma.transaction.update({
            where: {
                id
            },
            data: {
                location
            }
        })
        return res.status(200).json({ status: 200, message: 'Success to edit location', data: transaction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

router.get("/", getAllTransactions)
router.get("/:id", getTransaction)
router.patch("/:id", editLocation)

export default router