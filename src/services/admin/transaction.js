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
                auction: true,
                buyer: true,
            },
        })


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
        return res.status(200).json({ status: 200, message: 'Success', data: transaction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

router.get("/", getAllTransactions)
router.get("/:id", getTransaction)

export default router