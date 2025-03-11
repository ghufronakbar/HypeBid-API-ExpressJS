import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()

const getAllAuctions = async (req, res) => {
    try {
        const auctions = await prisma.auction.findMany({
            orderBy: {
                createdAt: 'desc'
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

        for (const auction of auctions) {
            if (auction.transaction) {
                const expiredTime = new Date(auction.transaction.createdAt)
                expiredTime.setDate(expiredTime.getDate() + 1)
                if (expiredTime < new Date() && auction.transaction.status === "Pending") {
                    auction.transaction.status = "Expired"
                }
            }
        }

        return res.status(200).json({ status: 200, message: 'Success', data: auctions })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const getAuction = async (req, res) => {
    const { id } = req.params
    try {
        const auction = await prisma.auction.findUnique({
            where: {
                id
            },
            include: {
                bids: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        user: true
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

        if (auction.transaction) {
            const expiredTime = new Date(auction.transaction.createdAt)
            expiredTime.setDate(expiredTime.getDate() + 1)
            if (expiredTime < new Date() && auction.transaction.status === "Pending") {
                auction.transaction.status = "Expired"
            }
        }

        return res.status(200).json({ status: 200, message: 'Success', data: auction })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const setAuctionStatus = async (req, res) => {
    const { id } = req.params
    const { status } = req.body
    try {
        if (typeof status !== "boolean") {
            return res.status(400).json({ status: 400, message: "Status must be boolean" })
        }
        const auction = await prisma.auction.findFirst({
            where: {
                id
            }
        });
        if (!auction) {
            return res.status(404).json({ status: 404, message: "Auction not found" })
        }
        if (auction.status !== "Pending") {
            return res.status(400).json({ status: 400, message: "Auction already accepted or rejected" })
        }
        const updatedAuction = await prisma.auction.update({
            where: {
                id
            },
            data: {
                status: status ? "Accepted" : "Rejected",
            }
        })
        return res.status(200).json({ status: 200, message: updatedAuction.status ? "Successfull to accept auction" : "Successfull to reject auction", data: updatedAuction })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

router.get("/", getAllAuctions)
router.get("/:id", getAuction)
router.patch("/:id", setAuctionStatus)

export default router