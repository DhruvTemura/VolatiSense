pipeline {
    agent any
    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        stage('Build Containers') {
            steps {
                echo 'Building Docker containers...'
                sh 'docker-compose build'
            }
        }
        stage('Run Containers') {
            steps {
                echo 'Running Docker containers...'
                sh 'docker-compose up -d'
            }
        }
    }
    post {
        always {
            echo 'Cleaning up...'
            sh 'docker-compose down'
        }
    }
}
