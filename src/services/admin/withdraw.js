import express from 'express'
import prisma from '../../db/prisma.js'
import { APP_NAME } from '../../constant/index.js'
import { sendWhatsapp } from '../../config/whatsapp.js'
const router = express.Router()

const getAllWithdraw = async (req, res) => {
    try {
        const withdraws = await prisma.withdraw.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: true
            }
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
            return res.status(404).json({ status: 404, message: 'Data not found!' })
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

        if (withdraw.status === "Paid") {
            return res.status(400).json({ status: 400, message: "Withdraw already paid" })
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

        sendWhatsapp(updatedWithdraw?.user?.phone, `*${APP_NAME}*\n\nHi ${updatedWithdraw?.user?.name},\nYour disbursement request is accepted.\n\nDetails:\nRef ID: ${withdraw.id}\nBank: ${withdraw.bank}\nAccount: ${withdraw.account}\nAmount: ${withdraw.amount}\n\nPlease check your bank account.\n\nBest regards,\n${APP_NAME}\nThank you!`)

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