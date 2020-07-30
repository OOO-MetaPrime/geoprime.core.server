'use strict'

const path = require('path')
const pMemoize = require('p-memoize')
const axios = require('axios')
const { getDb } = require('../database')
const database = getDb()
const fs = require('fs')
// const zl = require('zip-lib')
const mime = require('mime')

const memGetSystemParameters = pMemoize(getSystemParameters, { maxAge: 20000 })
function isImage (fileName) {
  const fileExt = path.extname(fileName)
  switch (fileExt) {
    case '.jpeg':
    case '.jpg':
    case '.png':
    case '.bmp':
    case '.gif': return true
    default: return false
  }
}

function getDefaultPreview (files, newFiles) {
  if (files && files.length === 0 && newFiles) {
    return newFiles.find(x => isImage(x.originalname))
  }
  return null
}

async function getSystemParameters () {
  return database.systemParameters.findOne({
    attributes: ['maxFileSize', 'filesStore']
  })
}

async function getFilesStoreUrl () {
  const systemParams = await memGetSystemParameters()

  return systemParams.filesStore
}

function getFileInfo (fileName) {
  const fileExtension = path.extname(fileName)
  const fileNameWithoutExt = path.basename(fileName, fileExtension)
  return {
    name: fileNameWithoutExt,
    fileType: fileExtension
  }
}

async function createBigFile (req, objectResource, file, transaction) {
  const systemParam = await memGetSystemParameters()
  const filesStore = systemParam.filesStore

  const { data: result } = await axios.post(`${filesStore}/file/${encodeURIComponent(objectResource)}`, file.buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      Cookie: `connect.sid=${req.cookies['connect.sid']}`
    }
  })
  if (!result.fileId) {
    throw new Error(result.error)
  }
  file.fileId = result.fileId

  const fileName = file.originalname
  const objectFile = await database.File.create({
    content: null
  },
    {
      transaction
    }
  )
  const fileInfo = getFileInfo(fileName)
  const createdFileInfo = await database.FileInfo.create({
    name: fileInfo.name,
    file_type: fileInfo.fileType,
    file_id: objectFile.id,
    upload_date: new Date(),
    externalStorageId: file.fileId
  },
    {
      transaction
    }
  )

  return createdFileInfo
}

async function createSmallFile (file, transaction) {
  const fileName = file.originalname
  const objectFile = await database.File.create({
    content: file.buffer
  },
    {
      transaction
    }
  )
  const fileInfo = getFileInfo(fileName)
  return database.FileInfo.create({
    name: fileInfo.name,
    file_type: fileInfo.fileType,
    file_id: objectFile.id,
    upload_date: new Date(),
    externalStorageId: null
  },
    {
      transaction
    }
  )
}

async function getFileSize (req, fileInfo) {
  if (fileInfo.externalStorageId) {
    const filesStore = await getFilesStoreUrl()
    const { data } = await axios.get(`${filesStore}/file/${fileInfo.externalStorageId}/info`, {
      headers: {
        Cookie: `connect.sid=${req.cookies['connect.sid']}`
      }
    })
    const size = data.size
    return size
  }
  const result = await database.File.findOne({
    attributes: [
      [database.sequelize.fn('length', database.sequelize.col('content')), 'fileSize']
    ],
    where: {
      id: fileInfo.file_id
    }
  })

  return result.dataValues.fileSize
}

async function createFile (req, objectResource, file, transaction) {
  const systemParam = await memGetSystemParameters()
  const maxFileSize = systemParam.maxFileSize * (1024 * 1024)

  const isBigFile = file.size > maxFileSize

  if (isBigFile) {
    return createBigFile(req, objectResource, file, transaction)
  } else {
    return createSmallFile(file, transaction)
  }
}

function getSafeFileName (fileName) {
  return fileName.replace(/[*"%?/\\[\]:|]/g, '_')
}

async function getFileInfoContent (req, fileInfoId, transaction) {
  const queryOptions = {
    include: [{
      model: database.File
    }]
  }
  if (transaction) {
    queryOptions.transaction = transaction
  }
  const fileInfo = await database.FileInfo.findById(fileInfoId, queryOptions)

  let content
  if (fileInfo.externalStorageId) {
    const systemParam = await memGetSystemParameters()
    const filesStore = systemParam.filesStore
    const result = await axios.get(`${filesStore}/file/${fileInfo.externalStorageId}`, {
      responseType: 'arraybuffer',
      headers: {
        Cookie: `connect.sid=${req.cookies['connect.sid']}`
      }
    })
    if (!result.data) {
      return {
        error: result.error
      }
    }
    content = result.data
  } else {
    content = fileInfo.File.content
  }

  return {
    fileInfo,
    content
  }
}

async function getZippedFiles (req, res, fileInfoIds) {
  res.status(200).send('Функция временно отключена')
  // if (!fileInfoIds || !fileInfoIds.length) {
  //   res.status(500).end()
  //   return
  // }
  // const cwd = path.join(__dirname, 'tmp')
  // fs.existsSync(cwd) || fs.mkdirSync(cwd)

  // const cwz = cwd + '.zip'

  // await database.sequelize.transaction(async tr => {
  //   for (const item of fileInfoIds) {
  //     const { content, fileInfo } = await getFileInfoContent(req, item, tr)
  //     const inp = fs.createWriteStream(`${cwd}/${fileInfo.fullName}`)
  //     inp.write(content)
  //     inp.close()
  //   }
  //   if (!fs.existsSync(cwd)) {
  //     res.status(500).end()
  //     return
  //   }
  //   zl.archiveFolder(cwd, cwz).then(() => {
  //     res.setHeader('Content-Type', 'octet-stream')
  //     res.setHeader('Content-Disposition', 'attachment; files.zip')
  //     const out = fs.ReadStream(cwz)
  //     out.on('end', () => {
  //       res.end()
  //       rmDir(cwd)
  //       fs.unlinkSync(cwz)
  //     })
  //     out.pipe(res)
  //   }).catch(err => {
  //     rmDir(cwd)
  //     res.status(500).end(err)
  //   })
  // })
}

function rmDir (cwd) {
  const files = fs.readdirSync(cwd)
  for (const item of files) {
    const curFilePath = path.join(cwd, item)
    fs.unlinkSync(curFilePath)
  }
  fs.rmdirSync(cwd)
}
module.exports = {
  getFileSize,
  getDefaultPreview,
  isImage,
  createFile,
  getSafeFileName,
  getFileInfoContent,
  getFilesStoreUrl,
  getFileInfo,
  getZippedFiles,
  rmDir
}
