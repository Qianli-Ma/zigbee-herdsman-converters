const firmwareOrigin = 'https://api.github.com/repos/fairecasoimeme/Zlinky_TIC/releases';
import {Zh, Logger, Ota, KeyValueAny} from '../types';
import assert from 'assert';
import * as common from './common';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    const manufacturerCode = current.manufacturerCode;
    const imageType = current.imageType;
    const releasesLIST = (await axios.get(firmwareOrigin)).data;

    let firmURL;

    // Find the most recent OTA file available
    for (const e of releasesLIST.sort((a: KeyValueAny, b: KeyValueAny) => a.published_at - a.published_at)) {
        if (e.assets) {
            const targetObj = e.assets.find((a: KeyValueAny) => a.name.endsWith('.ota'));
            if (targetObj && targetObj.browser_download_url) {
                firmURL = targetObj;
                break;
            }
        }
    }

    assert(firmURL,
        `No image available for manufacturerCode '${manufacturerCode}' imageType '${imageType} on Github repo'`);

    logger.info(`Using firmware file ` + firmURL.name);
    const image = common.parseImage((await common.getAxios().get(firmURL.browser_download_url, {responseType: 'arraybuffer'})).data);

    return {
        fileVersion: image.header.fileVersion,
        fileSize: firmURL.size,
        url: firmURL.browser_download_url,
    };
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
