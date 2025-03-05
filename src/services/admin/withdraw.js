import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()

const getAllWithdraw = async (req, res) => {
    try {
        const withdraws = await prisma.withdraw.findMany({
            orderBy: {
                createdAt: 'desc'
            },
        })

        return res.status(200).json({ status: 200, message: 'Success', data: withdraws })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const getWithdraw = async (req, res) => {
    const { id } = req.params
    try {
        const withdraw = await prisma.withdraw.findUnique({
            where: {
                id
            },
            include: {
                user: true
            },
        })
        if (!withdraw) {
            return res.status(404).json({ status: 404, message: 'Auction not found!' })
        }
        return res.status(200).json({ status: 200, message: 'Success', data: withdraw })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const setAcceptWithdraw = async (req, res) => {
    const { id } = req.params
    try {

        const withdraw = await prisma.withdraw.findUnique({
            where: {
                id
            },
            include: {
                user: true
            }
        });
        if (!withdraw) {
            return res.status(404).json({ status: 404, message: "Withdraw not found" })
        }

        const updatedWithdraw = await prisma.withdraw.update({
            where: {
                id
            },
            data: {
                status: "Paid",
                user: {
                    update: {
                        pendingBalance: withdraw.user.pendingBalance - withdraw.amount,                        
                        disburbedBalance: withdraw.user.disburbedBalance + withdraw.amount
                    }
                }
            },
            include: {
                user: true
            }
        })

        return res.status(200).json({ status: 200, message: "Successfull to accept withdraw", data: updatedWithdraw })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}


router.get("/", getAllWithdraw)
router.get("/:id", getWithdraw)
router.patch("/:id", setAcceptWithdraw)

export default router