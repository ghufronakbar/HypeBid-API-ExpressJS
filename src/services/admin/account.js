import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../../constant/index.js"
import verification from '../../middleware/verification.js'

export const login = async (req, res) => {
    const { email, password } = req.body
    try {
        if (!email || !password) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        const user = await prisma.user.findFirst({
            where: {
                email
            }
        })
        if (!user) {
            return res.status(404).json({ status: 404, message: 'User not found!' })
        }
        if (user.role !== "Admin") {
            return res.status(400).json({ status: 400, message: 'You are not admin!' })
        }

        const check = await bcrypt.compare(password, user.password)
        if (!check) {
            return res.status(400).json({ status: 400, message: 'Password is incorrect!' })
        }
        const accessToken = jwt.sign({ id: user.userId, role: user.role }, JWT_SECRET)
        return res.status(200).json({ status: 200, message: 'Login successful!', data: { accessToken, role: user.role } })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

export const profile = async (req, res) => {
    const { id } = req.decoded
    try {
        const data = await prisma.user.findFirst({
            where: {
                userId: id
            },
        })
        if (!data) {
            return res.status(404).json({ status: 404, message: 'Data not found!' })
        }
        return res.status(200).json({ status: 200, message: 'Account detail', data })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}


router.post("/login", login)
router.get("/", verification(["Admin"]), profile)


export default router