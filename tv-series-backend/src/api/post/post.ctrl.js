const Post = require('models/Post');
const Joi = require('joi');
const { ObjectId } = require('mongoose').Types;
const { decodeToken } = require('lib/token');
const fs = require('fs');
const path = require('path');
const uploadDirPath = '../../../uploads';



exports.checkObjectId = async (ctx, next) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.status = 400;
        return;
    }
    return next();

}

exports.checkAdmin = async (ctx, next) => {
    const token = ctx.cookies.get('access_token');

    const decoded = await decodeToken(token);

    const { admin } = decoded;

    if (!admin) {
        ctx.status = 401;
        return;
    }

    return next();

}

exports.create = async (ctx) => {
    let { name, teasers, actors, story, thumbnail, genre, startYear, endYear, firstBroadcasted } = ctx.request.body;
    let post = null;

    if (endYear === null || endYear === "") {
        endYear = "Running";
    }
    console.log(ctx.request.body);

    try {

        post = new Post({
            name,
            teasers,
            actors,
            story,
            thumbnail,
            genre,
            endYear,
            startYear,
            firstBroadcasted
        });

        post.save();
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.body = post;
}

exports.list = async (ctx) => {
    const page = parseInt(ctx.query.page || 1, 10);


    if (page < 1) {
        ctx.status = 400;
        return;
    }

    const { genre } = ctx.query;
    const query = genre ? {
        genre: genre
    } : {};

    let posts = null;

    try {
        if (genre === "all") {
        posts = await Post.find()
                .sort({ _id: -1 })
                .limit(10)
                .skip((page - 1) * 10)
                .lean()
                .exec();
        }
        else {
        posts = await Post.find(query)
            .sort({ _id: -1 })
            .limit(10)
            .skip((page - 1) * 10)
            .lean()
            .exec();
        }
        const postCount = await Post.count().exec();
        const limitStoryLength = post => ({
            ...post,
            actors: post.actors.slice(0, 2),
            story: post.story.length < 200 ? post.story : `${post.story.slice(0, 200)}...`
        });
        ctx.body = posts.map(limitStoryLength);
        ctx.set('Last-Page', Math.ceil(postCount / 10));
    } catch (e) {
        ctx.throw(500, e);
    }
}

exports.read = async (ctx) => {
    const { id } = ctx.params;

    try {
        const post = await Post.findById(id).exec();
        if (!post) {
            ctx.stauts = 404;
            return;
        }

        ctx.body = post;
    } catch (e) {
        ctx.throw(500, e);
    }
}

exports.getTop4Rated = async (ctx) => {
    const posts = await Post.find()
        .sort({ good: -1, _id: -1 })
        .limit(4)
        .exec();
    ctx.body = posts;
}

exports.get4Brandnew = async (ctx) => {
    const posts = await Post.find()
        .sort({ firstBroadcasted: -1, _id: -1 })
        .limit(4)
        .exec();
    ctx.body = posts;
}

exports.remove = async (ctx) => {
    const { id } = ctx.params;

    let post = null;

    try {
        post = await Post.findById(id).exec();
        let actorFiles = post.actors.map(
            (actor, i) => {
                return actor.img
            }
        );

        let thumbnail = post.thumbnail;

        if (!fs.existsSync(path.join(__dirname + uploadDirPath, thumbnail))) {
            ctx.status = 204;
            return;
        }
        fs.unlinkSync(path.join(__dirname + uploadDirPath, thumbnail));

        actorFiles.map(
            (actor, i) => {
                if (!fs.existsSync(path.join(__dirname + uploadDirPath, actor))) {
                    ctx.status = 204;
                    return;
                }
                fs.unlinkSync(path.join(__dirname + uploadDirPath, actor));
            }
        );


        await Post.findByIdAndRemove(id).exec();
        ctx.status = 204;
    } catch (e) {
        ctx.throw(500, e);
    }

}


exports.update = async (ctx) => {
    const { id } = ctx.params;
    const { name, teasers, actors, story, thumbnail, genre, startYear, endYear } = ctx.request.body;

    console.log("172: ", ctx.request.body);
    let post = null;

    try {
        post = await Post.findByIdAndUpdate(id, {
            name,
            teasers,
            actors,
            story,
            thumbnail,
            genre,
            startYear,
            endYear
        }, { new: true }).exec();
        if (!post) {
            ctx.status = 404;
            return;
        }

        ctx.body = post;
    } catch (e) {
        ctx.throw(500, e);
    }
}

exports.trash = async (ctx) => {
    let { prevServerThumbnailList, willRemoveServerFiles, willRemoveThumbnailFile } = ctx.request.body;
    console.log(prevServerThumbnailList);
    console.log(willRemoveServerFiles);
    console.log(willRemoveThumbnailFile);
    try {
        if (prevServerThumbnailList !== undefined) {
            await prevServerThumbnailList.map(
                (prev, i) => {
                    fs.unlinkSync(path.join(__dirname + '../../../uploads', prev.id))
                }
            );
        }

        if (willRemoveServerFiles.length !== undefined) {
            await willRemoveServerFiles.map(
                (will, i) => {
                    fs.unlinkSync(path.join(__dirname + '../../../uploads', will));
                }
            )
        }
        if (willRemoveThumbnailFile !== "") {
            await fs.unlinkSync(path.join(__dirname + '../../../uploads', willRemoveThumbnailFile));
        }

        ctx.status = 204;
        return;
    } catch (e) {
        ctx.throw(500, e);
    }
}