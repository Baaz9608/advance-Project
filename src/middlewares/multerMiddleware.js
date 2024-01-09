import multer from "multer"

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./public/temp")
    },
    filename: function(_, file, cb){
        console.log(file);
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage,
})

// fir se padhna hai kyonki is ko aur samajh na hai