"use strict";

import gulp from "gulp";
import sass from "gulp-sass";
import bourbon from "node-bourbon";
import buffer from "vinyl-buffer";
import source from "vinyl-source-stream";
import sourcemaps from "gulp-sourcemaps";
import uglify from "gulp-uglify";
import browserify from "browserify";
import plumber from "gulp-plumber";
import imagemin from "gulp-imagemin";
import changed from "gulp-changed";

gulp.task("sass", () => {
    return gulp.src("src/sass/**/*.sass")
        .pipe(changed("static/css"))
        .pipe(sourcemaps.init())
        .pipe(sass({
            includePaths: bourbon.with("node_modules/foundation-sites/scss"),
            style: "compressed",
            quiet: true
        }).on('error', sass.logError))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest("static/"));
});

gulp.task("images", () => {
    return gulp.src("src/img/**/*")
        .pipe(plumber())
        .pipe(changed("static/img"))
        .pipe(imagemin())
        .pipe(gulp.dest("static/img"));
});

gulp.task("fonts", () => {
    return gulp.src("src/fonts/**/*")
        .pipe(gulp.dest("static/fonts"));
});

gulp.task("js", () => {
    let bundler = browserify({
        entries: "src/js/app.es6",
        debug: true
    });

    bundler.bundle()
        .pipe(source("app.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest("static/"));
});

gulp.task("watch", () => {
    gulp.watch("src/sass/**/*", ["sass"]);
    gulp.watch("src/js/**/*", ["js"]);
    gulp.watch("src/img/**/*", ["images"])
});

gulp.task("default", ["fonts", "sass", "js", "images"]);