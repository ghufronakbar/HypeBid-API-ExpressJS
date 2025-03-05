import express from 'express'
import prisma from '../../db/prisma.js'
import { MIDTRANS_SERVER_KEY, MIDTRANS_URL_API } from '../../constant/midtrans.js'
import axios, { AxiosError, } from 'axios'
const router = express.Router()

const getAllAuctions = async (req, res) => {
    try {
        const { id: userId } = req.decoded
        const auctions = await prisma.auction.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                bids: {
                    orderBy: {
                        amount: 'desc'
                    },
                    take: 1
                },
                transaction: {
                    include: {
                        buyer: true
                    }
                },
                seller: true
            },
            where: {
                status: "Accepted"
            }
        })

        const expiredAuctions = auctions.filter(auction => {
            const now = new Date()
            const endDate = new Date(auction.end)
            return now > endDate
        })

        const notExpiredAuctions = auctions.filter(auction => {
            const now = new Date()
            const endDate = new Date(auction.end)
            return now < endDate
        })

        for (const auction of expiredAuctions) {
            auction.isAbleToBid = false
        }

        for (const auction of notExpiredAuctions) {
            const latestBid = auction.bids[0].amount || auction.openingPrice
            if (auction.buyNowPrice > latestBid) {
                auction.isAbleToBid = true
            } else {
                auction.isAbleToBid = false
            }

            if (auction.buyNowPrice > latestBid || auction.end < new Date() && !auction.transaction) {
                auction.isAbleToFinish = false
            } else {
                auction.isAbleToFinish = true
            }

            if (auction.userId === userId) {
                auction.isAbleToBid = false
            }
        }

        const data = [...notExpiredAuctions, ...expiredAuctions]

        return res.status(200).json({ status: 200, message: 'Success', data })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const getAuction = async (req, res) => {
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
                        createdAt: 'desc'
                    }
                },
                transaction: {
                    include: {
                        buyer: true
                    }
                },
                seller: true
            },
        })
        if (!auction) {
            return res.status(404).json({ status: 404, message: 'Auction not found!' })
        }

        const latestBid = auction.bids[0].amount || auction.openingPrice
        if (auction.buyNowPrice > latestBid) {
            auction.isAbleToBid = true
        } else {
            auction.isAbleToBid = false
        }

        if (auction.buyNowPrice > latestBid || auction.end < new Date() && !auction.transaction) {
            auction.isAbleToFinish = false
        } else {
            auction.isAbleToFinish = true
        }

        if (auction.userId === userId) {
            auction.isAbleToBid = false
        }

        return res.status(200).json({ status: 200, message: 'Success', data: auction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

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

const getOwnedAuctions = async (req, res) => {
    try {
        const { id: userId } = req.decoded

        const auctions = await prisma.auction.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                bids: {
                    orderBy: {
                        amount: 'desc'
                    },
                    take: 1
                },
                transaction: {
                    include: {
                        buyer: true
                    }
                },
                seller: true
            },
            where: {
                userId
            }
        })

        const expiredAuctions = auctions.filter(auction => {
            const now = new Date()
            const endDate = new Date(auction.end)
            return now > endDate
        })

        const notExpiredAuctions = auctions.filter(auction => {
            const now = new Date()
            const endDate = new Date(auction.end)
            return now < endDate
        })

        for (const auction of expiredAuctions) {
            auction.isAbleToBid = false
        }

        for (const auction of notExpiredAuctions) {
            const latestBid = auction.bids[0].amount || auction.openingPrice
            if (auction.buyNowPrice > latestBid) {
                auction.isAbleToBid = true
            } else {
                auction.isAbleToBid = false
            }

            if (auction.buyNowPrice > latestBid || auction.end < new Date()) {
                auction.isAbleToFinish = false
            } else {
                auction.isAbleToFinish = true
            }

            if (auction.userId === userId) {
                auction.isAbleToBid = false
            }
        }

        const data = [...notExpiredAuctions, ...expiredAuctions]

        return res.status(200).json({ status: 200, message: 'Success', data })
    } catch (error) {

    }
}

router.get("/", getAllAuctions)
router.get("/owned", getOwnedAuctions)
router.get("/:id", getAuction)
router.patch("/:id", finishAuction)

export default router