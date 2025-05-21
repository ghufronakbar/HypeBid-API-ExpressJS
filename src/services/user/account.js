import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../../constant/index.js"
import uploadCloudinary from "../../utils/cloudinary/uploadCloudinary.js"
import removeCloudinary from "../../utils/cloudinary/removeCloudinary.js"
import verification from '../../middleware/verification.js'
import validateEmail from '../../utils/validateEmail.js'

export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        const data = await prisma.user.findFirst({
            where: {
                email
            },
        })
        if (!data) {
            return res.status(404).json({ status: 404, message: 'Wrong email or password!' })
        }
        if (data.role === "Admin") {
            return res.status(400).json({ status: 400, message: 'You are not user!' })
        }
        const { role } = data
        const accessToken = jwt.sign({ id: data.id, role }, JWT_SECRET)
        const check = await bcrypt.compare(password, data.password)
        if (!check) {
            return res.status(400).json({ status: 400, message: 'Wrong email or password!' })
        }
        return res.status(200).json({ status: 200, message: 'Login successful!', data: { accessToken, role, ...data } })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const register = async (req, res) => {
    try {
        const { email, name, password, phone } = req.body
        if (!email || !name || !password || !phone) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string" || typeof phone !== "string") {
            return res.status(400).json({ status: 400, message: 'All data must be string!' })
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ status: 400, message: 'Email is not valid!' })
        }

        const check = await prisma.user.findUnique({
            where: {
                email
            }, select: {
                email: true
            }
        })
        if (check) {
            return res.status(400).json({ status: 400, message: 'Email already exist!' })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                phone,
                role: "User",
            }
        })

        const { role } = user
        const accessToken = jwt.sign({ id: user.id, role }, JWT_SECRET)
        return res.status(200).json({ status: 200, message: 'Register successful!', data: { ...user, accessToken, role } })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const profile = async (req, res) => {
    try {
        const { id } = req.decoded
        const data = await prisma.user.findUnique({
            where: {
                id
            },
        })
        if (!data) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        return res.status(200).json({ status: 200, message: 'Detail profile', data })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const edit = async (req, res) => {
    try {
        const { id } = req.decoded
        const { name, phone, email } = req.body

        if (!email || !name || !phone) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        if (typeof email !== "string" || typeof name !== "string" || typeof phone !== "string") {
            return res.status(400).json({ status: 400, message: 'All data must be string!' })
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ status: 400, message: 'Email is not valid!' })
        }


        const check = await prisma.user.findUnique({
            where: {
                email
            }, select: {
                email: true,
                id: true
            }
        })

        if (check && check.id !== id) {
            return res.status(400).json({ status: 400, message: 'Email already exist!' })
        }


        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                name,
                phone
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully update profile', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const image = async (req, res) => {
    try {
        const { id } = req.decoded
        const image = req.file
        if (!image) {
            return res.status(400).json({ status: 400, message: 'Image must be uploaded' })
        }
        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                image: true
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        if (check.image) {
            removeCloudinary(check.image, "profile")
        }
        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                image: image.path
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully update photo profile', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const deleteImage = async (req, res) => {
    try {
        const { id } = req.decoded

        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                image: true
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        if (check.image) {
            removeCloudinary(check.image, "profile")
        }
        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                image: null
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully delete photo profile', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const changePassword = async (req, res) => {
    try {
        const { id } = req.decoded
        const { newPassword, oldPassword, confirmPassword } = req.body

        if (!newPassword || !oldPassword || !confirmPassword) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ status: 400, message: 'Confirm password must be same with new password' })
        }
        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                password: true
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        const isValidPassword = await bcrypt.compare(oldPassword, check.password)
        if (!isValidPassword) {
            return res.status(400).json({ status: 400, message: 'Wrong old password' })
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                password: hashedPassword
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully update password', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}


router.get("/", verification(["User"]), profile)
router.put("/", verification(["User"]), edit)
router.patch("/", verification(["User"]), uploadCloudinary("profile").single("image"), image)
router.delete("/", verification(["User"]), deleteImage)
router.post("/login", login)
router.post("/register", register)
router.put("/change-password", verification(["User"]), changePassword)

export default router