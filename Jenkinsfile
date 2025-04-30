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
                sh '''
                    docker-compose down --remove-orphans || true
                    docker-compose build --no-cache
                '''
            }
        }

        stage('Run Docker Containers') {
            steps {
                echo 'Starting containers with docker-compose...'
                sh 'docker-compose up -d'
            }
        }

        stage('Verify Running Containers') {
            steps {
                echo 'Verifying containers are up and running...'
                sh 'docker-compose ps'
            }
        }

        stage('Show Docker Logs') {
            steps {
                echo 'Showing recent logs from backend and frontend...'
                sh '''
                    echo "===== Backend Logs ====="
                    docker-compose logs --tail=50 backend || true

                    echo "===== Frontend Logs ====="
                    docker-compose logs --tail=50 frontend || true
                '''
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed. Bringing down containers...'
            sh 'docker-compose down'
        }
        success {
            echo 'Pipeline executed successfully!'
        }
        always {
            echo 'Pruning unused Docker images...'
            sh 'docker image prune -f || true'
        }
    }
}
