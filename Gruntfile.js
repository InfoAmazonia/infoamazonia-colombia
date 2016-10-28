module.exports = function(grunt) {

	grunt.initConfig({
		browserify: {
			all: {
				files: {
					'public/js/app.js': 'src/js/index.js'
				}
			}
		},
		uglify: {
			all: {
				options: {
					mangle: true,
					compress: true
				},
				files: {
					'public/js/app.js': 'public/js/app.js',
				}
			}
		},
		less: {
			all: {
				options: {
					compress: true,
					sourceMap: true
				},
				files: {
					'public/css/app.css': 'src/css/main.less'
				}
			}
		},
		pug: {
			all: {
				options: {
					pretty: true,
					doctype: 'html'
				},
				files: [{
					expand: true,
					cwd: 'src',
					src: ['**/*.pug', '!views/includes/**/*'],
					dest: 'public',
					ext: '.html'
				}]
			}
		},
		copy: {
			all: {
				files: [
					{
						cwd: 'src',
						src: ['**', '!js/**', '!**/*.less', '!**/*.pug', '!**/*.js'],
						dest: 'public',
						expand: true
					},
					{
						cwd: 'src',
						src: ['**'],
						dest: 'public/src',
						expand: true
					}
				]
			},
			modules: {
				files: [
					{
						cwd: 'bower_components',
						src: [
							'**',
							'!**/*.md',
							'!**/*.html'
						],
						dest: 'public/lib',
						expand: true
					}
				]
			}
		},
		watch: {
			options: {
				livereload: true
			},
			css: {
				files: 'src/css/**/*.less',
				tasks: ['less']
			},
			views: {
				files: ['src/**/*.pug', 'src/views/**/*.pug'],
				tasks: ['pug']
			},
			scripts: {
				files: 'src/js/**/*.js',
				tasks: ['browserify']
			},
			copy: {
				files: ['src/**', '!src/**/*.less', '!src/**/*.pug', '!src/**/*.js'],
				tasks: ['copy']
			}
		},
		'gh-pages': {
			options: {
				base: 'public'
			},
			src: ['**']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-pug');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-gh-pages');

	grunt.registerTask(
		'javascript',
		'Compile scripts.',
		['browserify', 'uglify']
	);

	grunt.registerTask(
		'views',
		'Compile views.',
		['pug', 'less']
	);

	grunt.registerTask(
		'build',
		'Compiles everything.',
		['copy', 'javascript', 'views']
	);

	grunt.registerTask(
		'deploy',
		'Build and deploy to GitHub Pages.',
		['build', 'gh-pages']
	)

	grunt.registerTask(
		'default',
		'Build and start watching.',
		['build', 'watch']
	);

}
