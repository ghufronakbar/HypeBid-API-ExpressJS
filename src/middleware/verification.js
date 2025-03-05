import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../constant/index.js'

const verification = (roles) => async (req, res, next) => {
    try {
        const bearerToken = req.headers.authorization
        if (!bearerToken) {
            return res.status(401).json({ status: 401, message: 'Unauthorized' })
        }
        const token = bearerToken.replace(/^Bearer\s+/, "");
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {            
            if (err) {
                return res.status(401).json({ status: 401, message: 'Unauthorized' })
            }
            if (!decoded) {
                return res.status(401).json({ status: 401, message: 'Unauthorized' })
            }
            if (roles.includes(decoded.role)) {
                req.decoded = decoded
                next()
            } else {
                return res.status(401).json({ status: 401, message: 'Unauthorized' })
            }
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error' })
    }

}

export default verification