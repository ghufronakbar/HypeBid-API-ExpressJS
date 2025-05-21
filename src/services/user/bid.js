import express from 'express'
import prisma from '../../db/prisma.js'
import { midtransCheckout } from '../../utils/midtrans.js'
const router = express.Router()

const getBids = async (req, res) => {
    try {
        const { id: userId } = req.decoded
        const bids = await prisma.bid.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                auction: {
                    include: {
                        bids: {
                            orderBy: {
                                amount: 'desc'
                            },
                            take: 1
                        }
                    }
                }
            },
            where: {
                userId
            }
        })

        return res.status(200).json({ status: 200, message: 'Success', data: bids })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }

}

const getBid = async (req, res) => {
    try {
        const { id } = req.params
        const bids = await prisma.bid.findUnique({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                auction: {
                    include: {
                        bids: {
                            orderBy: {
                                amount: 'desc'
                            }
                        }
                    }
                }
            },
            where: {
                id
            }
        })

        if (!bids) return res.status(404).json({ status: 404, message: 'Data not found!' })

        return res.status(200).json({ status: 200, message: 'Success', data: bids })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }

}

const biddingAuction = async (req, res) => {
    try {
        const { id: userId } = req.decoded
        const { id } = req.params
        const { amount } = req.body
        if (!amount) {
            return res.status(400).json({ status: 400, message: "Amount is required" })
        }
        if (isNaN(Number(amount))) {
            return res.status(400).json({ status: 400, message: "Amount must be number" })
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({ status: 400, message: "Amount must be greater than 0" })
        }

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
            },
        })
        if (!auction) {
            return res.status(404).json({ status: 404, message: 'Auction not found!' })
        }

        if (auction.buyNowPrice === auction.bids?.[0]?.amount) {
            return res.status(400).json({ status: 400, message: 'Auction already ended!' })
        }

        if (auction.userId === userId) {
            return res.status(400).json({ status: 400, message: 'You are the seller!' })
        }

        if (auction.status !== "Accepted") {
            return res.status(400).json({ status: 400, message: 'Auction not accepted!' })
        }

        if (auction.start > new Date()) {
            return res.status(400).json({ status: 400, message: 'Auction not started yet!' })
        }

        if (auction.end < new Date()) {
            return res.status(400).json({ status: 400, message: 'Auction already ended!' })
        }

        if (auction.buyNowPrice < Number(amount)) {
            return res.status(400).json({ status: 400, message: `Maximum bid is Rp. ${auction.buyNowPrice}` })
        }

        let latestBid = auction.openingPrice
        for (const bid of auction.bids) {
            if (bid.amount > latestBid) {
                latestBid = bid.amount
            }
        }

        const minimumToBid = latestBid + auction.minimumBid

        if (Number(amount) < minimumToBid && Number(amount) !== auction.buyNowPrice) {
            return res.status(400).json({ status: 400, message: `Minimum bid is Rp. ${minimumToBid}` })
        }



        if (Number(amount) === auction.buyNowPrice) {
            const TOTAL_AMOUNT = auction.buyNowPrice * 1.05
            const updatedAuction = await prisma.auction.update({
                where: {
                    id
                },
                data: {
                    bids: {
                        create: {
                            amount: Number(amount),
                            userId,
                        }
                    },
                    transaction: {
                        create: {
                            amount: TOTAL_AMOUNT,
                            status: "Pending",
                            userId
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

            const midtransResponse = await midtransCheckout(updatedAuction.transaction.id, Number(TOTAL_AMOUNT))

            const updateTransaction = await prisma.transaction.update({
                where: {
                    id: updatedAuction.transaction.id
                },
                data: {
                    snapToken: midtransResponse.token,
                    directUrl: midtransResponse.redirect_url
                }
            })

            return res.status(200).json({ status: 200, message: 'You have won the auction', data: updateTransaction })
        } else {
            const bidding = await prisma.bid.create({
                data: {
                    amount: Number(amount),
                    auctionId: id,
                    userId,
                }
            })
            return res.status(200).json({ status: 200, message: 'Success to bid, Good Luck!', data: bidding })
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

router.get("/", getBids)
router.get("/:id", getBid)
router.post("/:id", biddingAuction)

export default router