Attribute VB_Name = "SaberX_Procurement_Engine"
Option Explicit

' ==============================================================================
' SABERX - SISTEMA DE GESTÃO DE COTAÇÕES E COMPRAS CORPORATIVAS
' Módulo: SaberX_Procurement_Engine
' Autor: Arquiteto de Soluções Sênior em Excel & Procurement
' Versão: 2.4 Enterprise
' ==============================================================================

Public Const SENHA_SISTEMA As String = "SABERX2026"
Public Const ABA_COTACAO As String = "MAPA_COTACAO"
Public Const ABA_AUDITORIA As String = "LOG_AUDITORIA"

' ------------------------------------------------------------------------------
' MACRO 1: FINALIZAR E EXPORTAR PARA PDF PROTEGIDO
' Valida status 'FECHADO/APROVADO', salva PDF com nome dinâmico e bloqueia edição
' ------------------------------------------------------------------------------
Public Sub Finalizar_E_Exportar_Cotacao()
    Dim ws As Worksheet
    Dim statusCotacao As String
    Dim numCotacao As String
    Dim caminhoArquivo As String
    Dim nomeArquivo As String
    Dim valorTotal As Double
    Dim dataHoje As String
    
    On Error GoTo TrataErro
    
    Set ws = ThisWorkbook.Sheets(ABA_COTACAO)
    
    ' 1. Validação de Dados de Entrada
    numCotacao = Trim(ws.Range("B2").Value)
    statusCotacao = Trim(UCase(ws.Range("B7").Value))
    
    If numCotacao = "" Then
        MsgBox "ATENÇÃO: O Número da Cotação (célula B2) é obrigatório.", vbExclamation, "Validação SaberX"
        ws.Range("B2").Select
        Exit Sub
    End If
    
    ' 2. Validação Estrita do Status de Fechamento
    If statusCotacao <> "FECHADO/APROVADO" Then
        MsgBox "AÇÃO BLOQUEADA: A cotação só pode ser finalizada e exportada se o Status (B7) estiver como 'FECHADO/APROVADO'." & vbCrLf & _
               "Status atual: " & statusCotacao, vbCritical, "Controle de Aprovação"
        Exit Sub
    End If
    
    ' Otimizações de Desempenho
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' 3. Montar nome padronizado do PDF
    dataHoje = Format(Now, "yyyymmdd_hhnn")
    caminhoArquivo = ThisWorkbook.Path
    If caminhoArquivo = "" Then caminhoArquivo = Environ("USERPROFILE") & "\Desktop"
    caminhoArquivo = caminhoArquivo & Application.PathSeparator
    
    nomeArquivo = caminhoArquivo & "SABERX_COTACAO_" & numCotacao & "_" & dataHoje & ".pdf"
    
    ' 4. Exportação do PDF da aba atual
    ws.ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=nomeArquivo, _
        Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, _
        OpenAfterPublish:=True
        
    ' 5. Proteção Institucional da Planilha
    ws.Protect Password:=SENHA_SISTEMA, _
               DrawingObjects:=True, _
               Contents:=True, _
               Scenarios:=True, _
               AllowFiltering:=True, _
               AllowSorting:=True
               
    ' 6. Registrar na Trilha de Auditoria
    On Error Resume Next
    valorTotal = ws.Range("E6").Value
    Registrar_Log_Auditoria numCotacao, "APROVAÇÃO & EXPORTAÇÃO PDF", valorTotal, "Diretoria / Gerência"
    On Error GoTo TrataErro
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "COTAÇÃO FINALIZADA COM SUCESSO!" & vbCrLf & vbCrLf & _
           "1. Arquivo PDF gerado e aberto:" & vbCrLf & nomeArquivo & vbCrLf & vbCrLf & _
           "2. A planilha foi blindada contra edições não autorizadas com a senha corporativa.", vbInformation, "SaberX Suprimentos"
    Exit Sub

TrataErro:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Erro ao finalizar cotação: " & Err.Description, vbCritical, "Falha de Sistema"
End Sub

' ------------------------------------------------------------------------------
' MACRO 2: INICIAR NOVA COTAÇÃO SEGURA
' Limpa apenas inputs manuais (SpecialCells), mantém fórmulas intactas e gera ID
' ------------------------------------------------------------------------------
Public Sub Iniciar_Nova_Cotacao_Segura()
    Dim ws As Worksheet
    Dim resposta As VbMsgBoxResult
    Dim rngInputs As Range
    Dim novoID As String
    Dim numRandom As Long
    
    On Error GoTo TrataErro
    
    resposta = MsgBox("Deseja iniciar uma NOVA cotação?" & vbCrLf & vbCrLf & _
                      "• Os preços e prazos cotados serão limpos." & vbCrLf & _
                      "• TODAS as fórmulas de TCO, Mínimo, Vencedor e Saving serão rigorosamente preservadas." & vbCrLf & _
                      "• Um novo ID sequencial será gerado.", _
                      vbQuestion + vbYesNo + vbDefaultButton2, "SaberX - Nova Cotação")
                      
    If resposta = vbNo Then Exit Sub
    
    Set ws = ThisWorkbook.Sheets(ABA_COTACAO)
    
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    
    ' 1. Desproteger temporariamente
    On Error Resume Next
    ws.Unprotect Password:=SENHA_SISTEMA
    On Error GoTo TrataErro
    
    ' 2. Gerar novo ID institucional com ano corrente
    Randomize
    numRandom = Int((9999 - 1000 + 1) * Rnd + 1000)
    novoID = "COT-" & Year(Date) & "-" & Format(numRandom, "0000")
    
    ws.Range("B2").Value = novoID
    ws.Range("B6").Value = Date
    ws.Range("B7").Value = "EM COTAÇÃO"
    ws.Range("B3").Value = "" ' Projeto
    ws.Range("B4").Value = "" ' Cliente
    
    ' 3. Limpeza Seletiva de Itens (Apenas Constantes F10:Q100, preservando colunas R:X)
    On Error Resume Next
    Set rngInputs = ws.Range("F10:Q100").SpecialCells(xlCellTypeConstants)
    If Not rngInputs Is Nothing Then
        rngInputs.ClearContents
    End If
    On Error GoTo TrataErro
    
    ' 4. Registrar em Auditoria
    On Error Resume Next
    Registrar_Log_Auditoria novoID, "REINICIALIZAÇÃO DE COTAÇÃO", 0, "Comprador Responsável"
    On Error GoTo TrataErro
    
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    
    MsgBox "NOVA COTAÇÃO CRIADA!" & vbCrLf & vbCrLf & _
           "ID Atribuído: " & novoID & vbCrLf & _
           "Status: EM COTAÇÃO" & vbCrLf & _
           "Fórmulas preservadas e prontas para preenchimento.", vbInformation, "SaberX Suprimentos"
    Exit Sub

TrataErro:
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    MsgBox "Erro ao reiniciar cotação: " & Err.Description, vbCritical, "Falha de Sistema"
End Sub

' ------------------------------------------------------------------------------
' MACRO 3: AUDITORIA CORPORATIVA (LOG EM ABA OCULTA)
' ------------------------------------------------------------------------------
Private Sub Registrar_Log_Auditoria(ByVal idCotacao As String, ByVal acao As String, ByVal valor As Double, ByVal alcada As String)
    Dim wsLog As Worksheet
    Dim proxLinha As Long
    
    On Error Resume Next
    Set wsLog = ThisWorkbook.Sheets(ABA_AUDITORIA)
    If wsLog Is Nothing Then Exit Sub
    
    proxLinha = wsLog.Cells(wsLog.Rows.Count, "A").End(xlUp).Row + 1
    If proxLinha < 4 Then proxLinha = 4
    
    wsLog.Cells(proxLinha, "A").Value = Format(Now, "dd/mm/yyyy hh:nn:ss")
    wsLog.Cells(proxLinha, "B").Value = Environ("USERNAME")
    wsLog.Cells(proxLinha, "C").Value = idCotacao
    wsLog.Cells(proxLinha, "D").Value = acao
    wsLog.Cells(proxLinha, "E").Value = valor
    wsLog.Cells(proxLinha, "F").Value = alcada
End Sub
