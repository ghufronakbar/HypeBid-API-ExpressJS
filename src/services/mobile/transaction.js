import express from 'express'
import prisma from '../../db/prisma.js'
import { MIDTRANS_SERVER_KEY, MIDTRANS_URL_API, MIDTRANS_URL_API2 } from '../../constant/midtrans.js'
import axios, { AxiosError, } from 'axios'
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

        return res.status(200).json({ status: 200, message: 'Success', transactions })
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

        if (transaction.userId !== userId) {
            return res.status(400).json({ status: 400, message: 'You are not seller!' })
        }

        const checkStatusTransaction = await midtransCheck(id)
        console.log(checkStatusTransaction)
        if (checkStatusTransaction) {
            const { transaction_status, status_code, settlement_time } = checkStatusTransaction
            if (status_code && transaction_status && settlement_time && status_code === '200' && transaction_status === 'settlement') {
                console.log("hitted")
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
                await prisma.user.update({
                    where: {
                        id: ts.auction.seller.id
                    },
                    data: {
                        balance: ts.amount * 100 / 105
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

        return res.status(200).json({ status: 200, message: 'Success', transactions: transaction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const midtransCheck = async (order_id) => {
    try {
        const encodedServerKey = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString('base64');

        const { data } = await axios.get(
            MIDTRANS_URL_API2 + "/v2/" + order_id + "/status",
            {
                headers: {
                    'Authorization': `Basic ${encodedServerKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return data;
    } catch (error) {
        console.log('Midtrans Error:', error);
        return null
    }
};

const midtransCheckout = async (order_id, gross_amount) => {
    try {
        const encodedServerKey = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString('base64');

        const { data } = await axios.post(
            MIDTRANS_URL_API + "/snap/v1/transactions",
            {
                transaction_details: {
                    order_id,
                    gross_amount
                },
            },
            {
                headers: {
                    'Authorization': `Basic ${encodedServerKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            console.log('Midtrans Error:', error.response?.data || error?.message);
            throw new Error("MIDTRANS_ERROR");
        } else {
            console.log('Midtrans Error:', error);
            throw new Error("MIDTRANS_ERROR");
        }
    }
};


const finishAuction = async (req, res) => {
    try {
        const { id } = req.params
        const { id: userId } = req.decoded
        const auction = await prisma.auction.findUnique({
            where: {
                id
            },
            include: {
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

        let highestBid = 0
        for (const bid of auction.bids) {
            if (bid.amount > highestBid) {
                highestBid = bid.amount
            }
        }

        if (auction.end > new Date() && auction.buyNowPrice > highestBid) {
            return res.status(400).json({ status: 400, message: 'Auction not ended yet!' })
        }

        const amount = highestBid * 1.05
        const updatedAuction = await prisma.auction.update({
            where: {
                id
            },
            data: {
                transaction: {
                    create: {
                        amount: amount,
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

        const midtransResponse = await midtransCheckout(updatedAuction.id, amount)

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

router.get("/", getAllTransactions)
router.get("/:id", getTransaction)
router.patch("/:id", finishAuction)

export default router