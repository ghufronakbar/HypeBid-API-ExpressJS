import express from 'express'
import prisma from '../../db/prisma.js'
import { midtransCheck, midtransCheckout } from '../../utils/midtrans.js'
const router = express.Router()

const getAllTransactions = async (req, res) => {
    try {
        const { id: userId } = req.decoded
        const transactions = await prisma.transaction.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                auction: true
            },
            where: {
                userId
            }
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
    try {
        const { id } = req.params
        const { id: userId } = req.decoded
        let transaction = await prisma.transaction.findUnique({
            include: {
                auction: {
                    include: {
                        seller: true
                    }
                }
            },
            where: {
                id
            }
        })

        if (!transaction) return res.status(404).json({ status: 404, message: 'Data not found!' })

        if (transaction.userId !== userId && transaction.auction.seller.id !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not buyer or seller!' })
        }

        const checkStatusTransaction = await midtransCheck(transaction.id)
        if (checkStatusTransaction && transaction.status === "Pending") {
            const { transaction_status, status_code, settlement_time } = checkStatusTransaction
            if (status_code && transaction_status && settlement_time && status_code === '200' && transaction_status === 'settlement') {
                const ts = await prisma.transaction.update({
                    where: {
                        id
                    },
                    data: {
                        status: "Paid"
                    },
                    include: {
                        auction: {
                            include: {
                                seller: true
                            }
                        }
                    }
                })
                transaction = ts
            }
        }

        const expiredTime = new Date(transaction.createdAt)
        expiredTime.setDate(expiredTime.getDate() + 1)
        if (expiredTime < new Date() && transaction.status === "Pending") {
            transaction.status = "Expired"
        }

        if (transaction.status !== "Expired") {

            // if (auction.buyNowPrice > latestBid || auction.end < new Date() && !auction.transaction) {
            //     auction.isAbleToFinish = false
            // } else {
            //     auction.isAbleToFinish = true
            // }


            if (transaction.auction.seller.id === userId) {
                transaction.auction.isSeller = true
            } else {
                transaction.auction.isSeller = false
            }

            if (transaction.userId === userId) {
                transaction.auction.isBuyer = true
            } else {
                transaction.auction.isBuyer = false
            }
        }

        return res.status(200).json({ status: 200, message: 'Success', data: transaction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}


const finishAuction = async (req, res) => {
    try {
        const { id } = req.params
        const { id: userId } = req.decoded
        const auction = await prisma.auction.findUnique({
            where: {
                id
            },
            include: {
                transaction: true,
                bids: {
                    orderBy: {
                        amount: 'desc'
                    }
                },
                seller: true
            }

        })
        if (!auction) {
            return res.status(404).json({ status: 404, message: 'Auction not found!' })
        }

        if (auction.userId !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not seller!' })
        }

        if (auction.status !== "Accepted") {
            return res.status(400).json({ status: 400, message: 'Auction not accepted!' })
        }

        if (auction.transaction) {
            return res.status(400).json({ status: 400, message: 'Auction already finished!' })
        }

        let highestBid = 0

        if (auction.bids.length === 0) {
            return res.status(400).json({ status: 400, message: 'No bids yet!' })
        }

        for (const bid of auction.bids) {
            if (bid.amount > highestBid) {
                highestBid = bid.amount
            }
        }

        if (auction.end > new Date() && auction.buyNowPrice > highestBid) {
            return res.status(400).json({ status: 400, message: 'Auction not ended yet!' })
        }

        const TOTAL_AMOUNT = highestBid * 1.05
        const updatedAuction = await prisma.auction.update({
            where: {
                id
            },
            data: {
                transaction: {
                    create: {
                        amount: TOTAL_AMOUNT,
                        status: "Pending",
                        userId: auction.bids[0].userId,
                    }
                }
            },
            include: {
                transaction: {
                    include: {
                        buyer: true
                    }
                }
            }
        })

        const midtransResponse = await midtransCheckout(updatedAuction.id, TOTAL_AMOUNT)

        const updateTransaction = await prisma.transaction.update({
            where: {
                id: updatedAuction.transaction.id
            },
            data: {
                snapToken: midtransResponse.token,
                directUrl: midtransResponse.redirect_url
            }
        })

        return res.status(200).json({ status: 200, message: 'Success to finish auction, waiting for payment', data: updateTransaction })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const makeDelivery = async (req, res) => {
    try {
        const { id } = req.params
        const { id: userId } = req.decoded

        const transaction = await prisma.transaction.findUnique({
            where: {
                id
            },
            include: {
                auction: {
                    include: {
                        seller: true
                    }
                }
            }
        })

        if (!transaction) {
            return res.status(404).json({ status: 404, message: 'Transaction not found!' })
        }

        if (transaction.auction.seller.id !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not seller!' })
        }

        if (transaction.status === "Pending") {
            return res.status(400).json({ status: 400, message: 'Transaction has not been paid!' })
        }

        if (transaction.status === "Delivered") {
            return res.status(400).json({ status: 400, message: 'Transaction already delivered!' })
        }

        if (transaction.status === "Completed") {
            return res.status(400).json({ status: 400, message: 'Transaction already completed!' })
        }

        const updatedTransaction = await prisma.transaction.update({
            where: {
                id
            },
            data: {
                status: "Delivered"
            }
        })

        return res.status(200).json({ status: 200, message: 'Mark as delivered', data: updatedTransaction })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const makeCompleted = async (req, res) => {
    try {
        const { id } = req.params
        const { id: userId } = req.decoded

        const transaction = await prisma.transaction.findUnique({
            where: {
                id
            },
            include: {
                auction: {
                    include: {
                        seller: true
                    }
                }
            }
        })

        if (!transaction) {
            return res.status(404).json({ status: 404, message: 'Transaction not found!' })
        }

        if (transaction.userId !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not buyer!' })
        }

        if (transaction.status === "Pending") {
            return res.status(400).json({ status: 400, message: 'Transaction has not been paid!' })
        }

        if (transaction.status === "Paid") {
            return res.status(400).json({ status: 400, message: 'Transaction has not been delivered!' })
        }

        if (transaction.status === "Completed") {
            return res.status(400).json({ status: 400, message: 'Transaction already completed!' })
        }

        const updatedTransaction = await prisma.transaction.update({
            where: {
                id
            },
            data: {
                status: "Completed"
            }
        })

        await prisma.user.update({
            where: {
                id: transaction.auction.seller.id
            },
            data: {
                balance: transaction.amount * 100 / 105
            }
        })

        return res.status(200).json({ status: 200, message: 'Mark as completed', data: updatedTransaction })

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
        return res.status(200).json({ status: 200, message: 'Successfully update location', data: transaction })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

router.get("/", getAllTransactions)
router.get("/:id", getTransaction)
router.patch("/:id", finishAuction)
router.patch("/:id/delivery", makeDelivery)
router.patch("/:id/completed", makeCompleted)
router.patch("/:id/location", editLocation)

export default router