pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out latest code...'
                git branch: 'main', url: 'https://github.com/DhruvTemura/VolatiSense.git'
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building Docker images for frontend, backend, and mongo...'
                bat """
                    docker-compose down --remove-orphans || exit /b 0
                    docker-compose build --no-cache
                """
            }
        }

        stage('Run Docker Containers') {
            steps {
                echo 'Starting containers with docker-compose...'
                bat 'docker-compose up -d'
            }
        }

        stage('Verify Running Containers') {
            steps {
                echo 'Verifying containers are up and running...'
                bat 'docker-compose ps'
            }
        }

        stage('Show Docker Logs') {
            steps {
                echo 'Showing recent logs from backend and frontend...'
                bat """
                    echo ===== Backend Logs =====
                    docker-compose logs --tail=50 backend || exit /b 0

                    echo ===== Frontend Logs =====
                    docker-compose logs --tail=50 frontend || exit /b 0
                """
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed. Bringing down containers...'
            bat 'docker-compose down'
        }
        success {
            echo 'Pipeline executed successfully!'
        }
        always {
            echo 'Pruning unused Docker images...'
            bat 'docker image prune -f || exit /b 0'
        }
    }
}
