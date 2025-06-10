const express = require("express");
const Company = require("../src/class/Company");
const Country = require("../src/class/Country");
const G = require("../src/tools/Glossary");
const R = require("../src/tools/Reply");

const router = express.Router();

router.post("/add", async (req, res) => {
    const { name, country, point, address, metadata, guid, code } = req.body;

    try {
        // Validation de GUID (doit exister, être une chaîne et avoir au moins 6 caractères)
        if (guid){
            if (!guid || typeof guid !== 'number' && typeof guid !== 'string' || guid.toString().trim().length < 6) {
                return R.handleError(res, `${G.errorDataVerification}: GUID invalide`, 400);
            }
        }

        // Validation du champ 'name'
        if (!name || typeof name !== 'string' || !name.trim()) {
            return R.handleError(res, `${G.errorMissingFields}: name`, 400);
        }
        if (name.length > 128) {
            return R.handleError(res, 'Le nom dépasse 128 caractères maximum', 400);
        }

        // Validation du champ 'code' (optionnel mais unique si présent)
        if (code !== undefined && code !== null) {
            if (typeof code !== 'string' || !code.trim()) {
                return R.handleError(res, 'Le code doit être une chaîne non vide ou null', 400);
            }
            if (code.length > 128) {
                return R.handleError(res, 'Le code dépasse 128 caractères maximum', 400);
            }
        }

        // Validation de 'country' (doit être un entier)
        if (typeof country !== 'number' || isNaN(country) || country.toString().trim().length <6) {
            return R.handleError(res, `${G.errorMissingFields}: country`, 400);
        }
        const countryFind = await Country.getByGuid("guid", country);
        if (!countryFind) {
            return R.response(false, G.errorGuid, res, 404);
        }

        // Validation du champ 'point' (doit être une chaîne au format WKT "POINT(lon lat)")
        if (!point) {
            return R.handleError(res, `${G.errorMissingFields}: point (géolocalisation)`, 400);
        }
        console.log(point);
        if ( typeof point !== 'object' || typeof point.lat !== 'number' || typeof point.long !== 'number') {
            return R.handleError(res, 'Le champ point doit être un objet contenant des valeurs numériques lat et long', 400);
        }

        const lat = point.lat;
        const long = point.long;

        if (long < -180 || long > 180) {
            return R.handleError(res, 'Longitude doit être entre -180 et 180', 400);
        }
        if (lat < -90 || lat > 90) {
            return R.handleError(res, 'Latitude doit être entre -90 et 90', 400);
        }

        // const pointRegex = /^POINT\((-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\)$/i;
        // const match = point.toString().match(pointRegex);
        // if (!match) {
        //     return R.handleError(res, 'Le champ point doit être au format WKT: POINT(longitude latitude)', 400);
        // }
        // const long = parseFloat(match[1]);
        // const lat = parseFloat(match[3]);
        // if (long < -180 || long > 180) {
        //     return R.handleError(res, 'Longitude doit être entre -180 et 180', 400);
        // }
        // if (lat < -90 || lat > 90) {
        //     return R.handleError(res, 'Latitude doit être entre -90 et 90', 400);
        // }

        // Validation de l'adresse (objet JSON avec les champs city, location, district)
        if (!address || typeof address !== 'object') {
            return R.handleError(res, G.errorDataVerification + ': adresse manquante ou invalide', 400);
        }
        const requiredAddressFields = ['city', 'location', 'district'];
        const missingAddress = requiredAddressFields.filter(
            field => !address[field] || typeof address[field] !== 'string' || !address[field].trim()
        );
        if (missingAddress.length > 0) {
            return R.handleError(res, `${G.errorMissingFields}: ${missingAddress.join(', ')}`, 400);
        }

        // Validation des metadata (objet JSON avec domaine, sector, speciality)
        if (!metadata || typeof metadata !== 'object') {
            return R.handleError(res, G.errorDataVerification + ': metadata manquante ou invalide', 400);
        }
        const requiredMetadataFields = ['domaine', 'sector', 'speciality'];
        const invalidMetadataFields = requiredMetadataFields.filter(field => {
            const val = metadata[field];
            if (!val) return true;
            if (typeof val === 'string') return val.trim() === '';
            if (Array.isArray(val)) {
                return val.length === 0 || val.some(item => typeof item !== 'string' || item.trim() === '');
            }
            return true;
        });
        if (invalidMetadataFields.length > 0) {
            return R.handleError(res, `${G.errorMissingFields}: ${invalidMetadataFields.join(', ')}`, 400);
        }

        // Création de l'instance Company (attention, bien formater les champs)
        const companyData = {
            name: name.trim(),
            guid: Number(guid),
            point: {
                latitude: Number(lat),
                longitude: Number(long),
            },
            country: countryFind.id,
            address: {
                city: address.city.trim(),
                location: address.location.trim(),
                district: address.district.trim()
            },
            metadata: {
                domaine: metadata.domaine,
                sector: metadata.sector,
                speciality: metadata.speciality
            }
        };
        if (code) companyData.code = code.trim();

        const company = new Company(companyData);
        const result = await company.save();

        if (!result) {
            return R.response(false, G.errorSaved, res, 500);
        }
        await result.loadCountry();

        return R.response(true, result.toDisplay(), res, 200);
    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
});
router.get("/all", async (req, res) => {
    try {
        const result = await Company.getAllCompany();
        if (!result) {
            return R.response(false, G.errorId, res, 500);
        }
        return R.response(true, result, res, 200);
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})

module.exports = router;
