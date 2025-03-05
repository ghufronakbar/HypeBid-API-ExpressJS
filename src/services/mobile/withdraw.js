import express from 'express'
import prisma from '../../db/prisma.js'
import { MIDTRANS_SERVER_KEY, MIDTRANS_URL_API } from '../../constant/midtrans.js'
import axios, { AxiosError, } from 'axios'
const router = express.Router()

const getAllOwnWithdraw = async (req, res) => {
    try {
        const { id: userId } = req.decoded

        const withdraws = await prisma.withdraw.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            where: {
                userId
            }
        })

        return res.status(200).json({ status: 200, message: 'Success', data: withdraws })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const getWithdraw = async (req, res) => {
    try {
        const { id } = req.params
        const { id: userId } = req.decoded

        const withdraw = await prisma.withdraw.findUnique({
            where: {
                id
            },
        })
        if (!withdraw) {
            return res.status(404).json({ status: 404, message: 'Data not found!' })
        }
        if (withdraw.userId !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not seller!' })
        }

        return res.status(200).json({ status: 200, message: 'Success', data: withdraw })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const makeWithdrawal = async (req, res) => {
    try {

        const { id: userId } = req.decoded
        const { amount, account, bank } = req.body

        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ status: 400, message: "Amount must be number" })
        }

        if (!account || !bank) {
            return res.status(400).json({ status: 400, message: "Account and Bank is required" })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })
        if (!user) {
            return res.status(404).json({ status: 404, message: 'User not found!' })
        }
        if (user.role !== "User") {
            return res.status(400).json({ status: 400, message: 'You are not user!' })
        }
        if (user.balance < Number(amount)) {
            return res.status(400).json({ status: 400, message: 'Your balance is not enough!' })
        }

        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                balance: user.balance - Number(amount),
                pendingBalance: user.pendingBalance + Number(amount)
            }
        })

        const withdrawal = await prisma.withdraw.create({
            data: {
                account,
                amount,
                bank,
                status: "Pending",
                userId,
            }
        })

        return res.status(200).json({ status: 200, message: 'Success', data: withdrawal })
    } catch (error) {

    }
}

router.get("/", getAllOwnWithdraw)
router.get("/:id", getWithdraw)
router.post("/", makeWithdrawal)

export default router